'use strict';
// GST Desk integration: Alexa voice is only a read-only client of the existing API.
// Amazon must deliver events via a skill-specific Alexa-hosted/Lambda endpoint.
const Alexa = require('ask-sdk-core');

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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(url, {method: 'GET', headers, signal: controller.signal});
    if (!response.ok) throw Error('api_unavailable');
    const data = await response.json();
    if (data.readOnly !== true || !data.availableMetrics || !data.drafts ||
        !Number.isSafeInteger(data.drafts.count) || data.drafts.count < 0) {
      throw Error('invalid_api_response');
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

const isIntent = name => input => Alexa.getRequestType(input.requestEnvelope) === 'IntentRequest' &&
  Alexa.getIntentName(input.requestEnvelope) === name;

const LaunchHandler = {
  canHandle: input => Alexa.getRequestType(input.requestEnvelope) === 'LaunchRequest',
  handle: input => say(input,
    'नमस्ते, जीएसटी डेस्क तैयार है। आप पूछ सकते हैं, कितने ड्राफ्ट चालान हैं, या सिस्टम की स्थिति क्या है?',
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
      const data = await getSummary();
      if (data.availableMetrics?.pendingDeliveries === true &&
          Number.isSafeInteger(data.orders?.pendingDeliveries) && data.orders.pendingDeliveries >= 0) {
        return say(input, 'मीशो के ' + data.orders.pendingDeliveries + ' ऑर्डर अभी डिलीवर होने बाकी हैं।');
      }
    } catch {}
    return say(input, 'डिलीवरी की ताज़ा स्थिति अभी जीएसटी डेस्क से सिंक नहीं हुई है। इसलिए पेंडिंग ऑर्डर की संख्या नहीं बता सकती।');
  },
};

const StatusHandler = {
  canHandle: isIntent('StatusIntent'),
  async handle(input) {
    try {
      await getSummary();
      return say(input, 'जीएसटी डेस्क का वॉइस कनेक्शन काम कर रहा है। ड्राफ्ट चालानों की जानकारी उपलब्ध है।');
    } catch {
      return say(input, 'जीएसटी डेस्क का डेटा कनेक्शन अभी उपलब्ध नहीं है।');
    }
  },
};

const HelpHandler = {
  canHandle: isIntent('AMAZON.HelpIntent'),
  handle: input => say(input,
    'अभी आप ड्राफ्ट चालान, आज के मीशो ऑर्डर, और पेंडिंग डिलीवरी के बारे में पूछ सकते हैं। जिन रिकॉर्ड का डेटा सिंक नहीं हुआ है, उनकी संख्या अभी उपलब्ध नहीं होगी।',
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
    'आप मुझसे आज के मीशो ऑर्डर, पेंडिंग डिलीवरी और ड्राफ्ट चालानों के बारे में पूछ सकते हैं।',
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
    LaunchHandler, DraftCountHandler, StatusHandler, TodayMeeshoOrdersHandler, PendingDeliveriesHandler, HelpHandler,
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
