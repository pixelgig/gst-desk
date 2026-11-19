'use strict';
// GST Desk integration: Alexa voice is only a read-only client of the existing API.
// Amazon must deliver events via a skill-specific Alexa-hosted/Lambda endpoint.
const Alexa = require('ask-sdk-core');
const https = require('node:https');

const say = (handlerInput, message, reprompt) => {
  const builder = handlerInput.responseBuilder.speak(message);
  if (reprompt) builder.reprompt(reprompt);
  return builder.getResponse();
};

function configured() {
  return Boolean(process.env.ALEXA_SKILL_ID &&
    process.env.ALEXA_ALLOWED_USER_ID &&
    process.env.GST_DESK_VOICE_API_URL &&
    process.env.GST_DESK_VOICE_API_TOKEN);
}

async function getSummary() {
  if (!configured()) throw Error('not_configured');
  const url = new URL(process.env.GST_DESK_VOICE_API_URL);
  if (url.protocol !== 'https:' || url.username || url.password ||
      url.search || url.hash || url.pathname !== '/api/voice/summary') {
    throw Error('invalid_endpoint');
  }
  const headers = {
    authorization: 'Bearer ' + process.env.GST_DESK_VOICE_API_TOKEN,
    accept: 'application/json',
  };
  // When Cloudflare Access protects the endpoint, use a scoped service token.
  const clientId = process.env.CF_ACCESS_CLIENT_ID;
  const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET;
  if (Boolean(clientId) !== Boolean(clientSecret)) throw Error('invalid_access_config');
  if (clientId && clientSecret) {
    headers['CF-Access-Client-Id'] = clientId;
    headers['CF-Access-Client-Secret'] = clientSecret;
  }
  // Alexa-hosted skills may use Node.js 16, which has no built-in fetch.
  // Reject redirects and unusually large responses; never log bearer credentials.
  const data = await new Promise((resolve, reject) => {
    const request = https.get(url, {headers, timeout: 3500}, response => {
      if (response.statusCode !== 200) {
        response.resume();
        reject(Error('api_unavailable'));
        return;
      }
      let body = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        body += chunk;
        if (body.length > 32768) request.destroy(Error('response_too_large'));
      });
      response.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(Error('invalid_json')); }
      });
      response.on('error', reject);
    });
    request.on('timeout', () => request.destroy(Error('api_timeout')));
    request.on('error', reject);
  });
  if (data.readOnly !== true || !data.availableMetrics || !data.drafts ||
      !Number.isSafeInteger(data.drafts.count) || data.drafts.count < 0) {
    throw Error('invalid_api_response');
  }
  return data;
}

const isIntent = name => input => Alexa.getRequestType(input.requestEnvelope) === 'IntentRequest' &&
  Alexa.getIntentName(input.requestEnvelope) === name;

const LaunchHandler = {
  canHandle: input => Alexa.getRequestType(input.requestEnvelope) === 'LaunchRequest',
  handle: input => say(input,
    'नमस्ते, जीएसटी डेस्क तैयार है। आप डिलीवर, रास्ते में, ए डब्ल्यू बी नहीं मिले, और रिटर्न पार्सल की संख्या पूछ सकते हैं।',
    'क्या आप ड्राफ्ट चालानों की संख्या जानना चाहेंगे?'),
};

const DraftCountHandler = {
  canHandle: isIntent('DraftCountIntent'),
  async handle(input) {
    try {
      const result = await getSummary();
      return say(input, 'जीएसटी डेस्क में ' + result.drafts.count +
        ' ड्राफ्ट चालान दर्ज हैं।', 'और क्या जानना चाहेंगे?');
    } catch {
      return say(input, 'अभी सुरक्षित डेटाबेस से जानकारी नहीं मिल पा रही है। बाद में फिर कोशिश करें।');
    }
  },
};

// These intents are wired now. We never infer order totals from old localStorage
// or the number of GST invoices; they must come from verified Meesho sync later.
const TodayMeeshoOrdersHandler = {
  canHandle: isIntent('TodayMeeshoOrdersIntent'),
  async handle(input) {
    try {
      const data = await getSummary();
      if (data.availableMetrics?.ordersToday === true &&
          Number.isSafeInteger(data.orders?.today) && data.orders.today >= 0) {
        return say(input, 'आज मीशो पर ' + data.orders.today + ' नए ऑर्डर दर्ज हुए हैं।');
      }
    } catch {}
    return say(input, 'आज के मीशो ऑर्डर की लाइव जानकारी अभी जीएसटी डेस्क से जुड़ी नहीं है। डेटा सिंक होने के बाद सही संख्या बताऊँगी।');
  },
};

const PendingDeliveriesHandler = {
  canHandle: isIntent('PendingDeliveriesIntent'),
  async handle(input) {
    try {
      const d = await getSummary();
      if (d.availableMetrics?.shipmentBreakdown === true &&
          Number.isSafeInteger(d.delivery?.verifiedInTransit) &&
          Number.isSafeInteger(d.delivery?.awaitingAwb)) {
        return say(input, 'जीएसटी डेस्क के सेव किए गए रिकॉर्ड में ' +
          d.delivery.verifiedInTransit + ' पार्सल रास्ते में हैं और ' +
          d.delivery.awaitingAwb + ' की ए डब्ल्यू बी दर्ज नहीं है। यह लाइव मीशो ऑर्डर की गिनती नहीं है।');
      }
    } catch {}
    return say(input, 'अभी सेव किए गए शिपमेंट की जानकारी उपलब्ध नहीं है। लाइव मीशो ऑर्डर सिंक भी कनेक्ट नहीं है।');
  },
};

const VerifiedDeliveredHandler = {
  canHandle: isIntent('VerifiedDeliveredIntent'),
  async handle(input) {
    try {
      const d = await getSummary();
      if (d.availableMetrics?.shipmentBreakdown === true &&
          Number.isSafeInteger(d.delivery?.totalDelivered) &&
          Number.isSafeInteger(d.delivery?.verifiedDelivered) &&
          Number.isSafeInteger(d.delivery?.ownerConfirmedDelivered)) {
        return say(input, 'जीएसटी डेस्क के रिकॉर्ड में कुल ' +
          d.delivery.totalDelivered + ' पार्सल डिलीवर दर्ज हैं। इनमें ' +
          d.delivery.verifiedDelivered + ' कैरियर द्वारा और ' +
          d.delivery.ownerConfirmedDelivered + ' आपके द्वारा कन्फर्म किए गए हैं।');
      }
    } catch {}
    return say(input, 'डिलीवरी की पुष्टि वाला रिकॉर्ड अभी उपलब्ध नहीं है।');
  },
};

const VerifiedTransitHandler = {
  canHandle: isIntent('VerifiedTransitIntent'),
  async handle(input) {
    try {
      const d = await getSummary();
      if (d.availableMetrics?.verifiedDeliveries === true &&
          Number.isSafeInteger(d.delivery?.verifiedInTransit)) {
        return say(input, 'जीएसटी डेस्क में ' + d.delivery.verifiedInTransit +
          ' पार्सल के ट्रांजिट में होने की पुष्टि हुई है। जिनका ए डब्ल्यू बी नहीं है, उन्हें रास्ते में नहीं गिना गया है।');
      }
    } catch {}
    return say(input, 'अभी ट्रांजिट का सत्यापित रिकॉर्ड उपलब्ध नहीं है।');
  },
};
const AwaitingAwbHandler = {
  canHandle: isIntent('AwaitingAwbIntent'),
  async handle(input) {
    try {
      const d = await getSummary();
      if (d.availableMetrics?.shipmentBreakdown === true &&
          Number.isSafeInteger(d.delivery?.awaitingAwb)) {
        return say(input, 'जीएसटी डेस्क के ' + d.delivery.awaitingAwb +
          ' शिपमेंट में ए डब्ल्यू बी दर्ज नहीं है। उनकी डिलीवरी स्थिति की पुष्टि नहीं हुई है।');
      }
    } catch {}
    return say(input, 'बिना ए डब्ल्यू बी वाले शिपमेंट की संख्या अभी उपलब्ध नहीं है।');
  },
};

const ReturnedOrdersHandler = {
  canHandle: isIntent('ReturnedOrdersIntent'),
  async handle(input) {
    try {
      const d = await getSummary();
      if (d.availableMetrics?.shipmentBreakdown === true &&
          Number.isSafeInteger(d.delivery?.returned)) {
        return say(input, 'जीएसटी डेस्क में ' + d.delivery.returned +
          ' शिपमेंट रिटर्न दर्ज है।');
      }
    } catch {}
    return say(input, 'रिटर्न हुए शिपमेंट का रिकॉर्ड अभी उपलब्ध नहीं है।');
  },
};

const DeliveryOverviewHandler = {
  canHandle: isIntent('DeliveryOverviewIntent'),
  async handle(input) {
    try {
      const d = await getSummary();
      const v = d.delivery || {};
      if (d.availableMetrics?.shipmentBreakdown === true &&
          ['totalDelivered','verifiedInTransit','awaitingAwb','returned']
            .every(k => Number.isSafeInteger(v[k]) && v[k] >= 0)) {
        return say(input, 'सेव किए गए शिपमेंट रिकॉर्ड के अनुसार, ' +
          v.totalDelivered + ' डिलीवर हैं, ' +
          v.verifiedInTransit + ' रास्ते में हैं, ' +
          v.awaitingAwb + ' की ए डब्ल्यू बी उपलब्ध नहीं है, और ' +
          v.returned + ' रिटर्न है। यह लाइव मीशो डेटा नहीं है।');
      }
    } catch {}
    return say(input, 'अभी पूरी डिलीवरी समरी उपलब्ध नहीं है।');
  },
};

const LastDeliveryDateHandler = {
  canHandle: isIntent('LastDeliveryDateIntent'),
  async handle(input) {
    try {
      const d = await getSummary();
      if (d.availableMetrics?.verifiedDeliveries === true) {
        if (d.delivery?.lastDeliveredDateIST &&
            /^\d{4}-\d\d-\d\d$/.test(d.delivery.lastDeliveredDateIST)) {
          return say(input, 'जीएसटी डेस्क के रिकॉर्ड में आखिरी पुष्टि की गई डिलीवरी ' +
            d.delivery.lastDeliveredDateIST + ' को हुई थी।');
        }
        return say(input, 'अभी किसी ऑर्डर की डिलीवरी तारीख सत्यापित नहीं हुई है।');
      }
    } catch {}
    return say(input, 'डिलीवरी की तारीख वाला रिकॉर्ड अभी एलेक्सा से नहीं जुड़ा है।');
  },
};
const UpdateDeliveryStatusHandler = {
  canHandle: isIntent('UpdateDeliveryStatusIntent'),
  async handle(input) {
    // Voice writes are intentionally disabled until the private voice endpoint,
    // allowed Alexa account, and bearer-token owner authorization are tested.
    return say(input, 'अभी डिलीवरी का अपडेट जीएसटी डेस्क में वैल्मो ट्रैकिंग के चेक स्टेटस बटन से किया जा सकता है। एलेक्सा से सुरक्षित अपडेट अभी लिंक होना बाकी है।');
  },
};

const StatusHandler = {
  canHandle: isIntent('StatusIntent'),
  async handle(input) {
    try {
      await getSummary();
      return say(input, 'जीएसटी डेस्क का वॉइस कनेक्शन काम कर रहा है। सेव किए गए डिलीवरी रिकॉर्ड उपलब्ध हैं।');
    } catch {
      return say(input, 'जीएसटी डेस्क का डेटा कनेक्शन अभी उपलब्ध नहीं है।');
    }
  },
};

const HelpHandler = {
  canHandle: isIntent('AMAZON.HelpIntent'),
  handle: input => say(input,
    'आप पूछ सकते हैं कितने डिलीवर हुए, कितने रास्ते में हैं, कितने की ए डब्ल्यू बी नहीं मिली, और कितने रिटर्न हुए। लाइव मीशो ऑर्डर का डेटा अभी उपलब्ध नहीं है।',
    'क्या आप ड्राफ्ट चालानों की संख्या जानना चाहेंगे?'),
};

const StopHandler = {
  canHandle: input => ['AMAZON.StopIntent', 'AMAZON.CancelIntent'].some(isIntentName =>
    isIntent(isIntentName)(input)),
  handle: input => say(input, 'ठीक है, फिर मिलेंगे।'),
};

const FallbackHandler = {
  canHandle: isIntent('AMAZON.FallbackIntent'),
  handle: input => say(input,
    'आप मुझसे सेव किए गए डिलीवरी, ट्रांजिट, रिटर्न और ए डब्ल्यू बी वाले शिपमेंट की समरी पूछ सकते हैं।',
    'ड्राफ्ट चालान कितने हैं?'),
};

const UnhandledHandler = {
  canHandle: () => true,
  handle: input => say(input, 'कृपया दोबारा पूछें। आप कह सकते हैं, कितने ड्राफ्ट चालान हैं?'),
};

const ErrorHandler = {
  canHandle: () => true,
  handle: input => say(input, 'माफ़ कीजिए, वॉइस अनुरोध पूरा नहीं हो पाया।'),
};

const internalHandler = Alexa.SkillBuilders.custom()
  .withSkillId(process.env.ALEXA_SKILL_ID || 'amzn1.ask.skill.UNCONFIGURED')
  .addRequestHandlers(
    LaunchHandler, DraftCountHandler, StatusHandler, TodayMeeshoOrdersHandler, PendingDeliveriesHandler,
    VerifiedDeliveredHandler, VerifiedTransitHandler, AwaitingAwbHandler, ReturnedOrdersHandler,
    DeliveryOverviewHandler, LastDeliveryDateHandler, UpdateDeliveryStatusHandler, HelpHandler,
    StopHandler, FallbackHandler, UnhandledHandler)
  .addErrorHandlers(ErrorHandler)
  .lambda();

function closedResponse(message) {
  return {
    version: '1.0',
    response: {
      outputSpeech: {type: 'PlainText', text: message},
      shouldEndSession: true,
    },
  };
}

exports.handler = async function handler(event, context) {
  const system = event && event.context && event.context.System;
  if (!configured()) return closedResponse('जीएसटी डेस्क का वॉइस कनेक्शन अभी सेट नहीं हुआ है।');
  if (!system ||
      system.application?.applicationId !== process.env.ALEXA_SKILL_ID ||
      system.user?.userId !== process.env.ALEXA_ALLOWED_USER_ID) {
    return closedResponse('यह निजी जीएसटी डेस्क इस एलेक्सा खाते के लिए उपलब्ध नहीं है।');
  }
  return internalHandler(event, context);
};
