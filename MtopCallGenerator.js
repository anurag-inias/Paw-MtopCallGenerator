const configTemplate = (config) => JSON.stringify(config, null, 2).replace(/\n/g, '\n  ');

const template = (requestConfig, globalConfig) => `
mtop.config.prefix = "${globalConfig.prefix}";
mtop.config.subDomain = "${globalConfig.subDomain}";
mtop.config.mainDomain = "${globalConfig.mainDomain}";

mtop.request(
  ${configTemplate(requestConfig)},
  function(response) {
    console.log("On success", response);
  },
  function(error) {
    console.log("On failure", error);
  }
)`.trim();

const MtopCallGenerator = function () {

    this.generate = function (context, requests, options) {
        const requestConfig = requests[0].urlParameters || {};
        requestConfig.type = requests[0].method || 'GET';
        fixObjectType(requestConfig);

        requestConfig.data = getBody(requests[0]);
        deleteTransientKeys(requestConfig);

        return template(requestConfig, extractGlobalConfig(requests[0]));
    }
}

/**
 * Fix type for integer and boolean values.
 * Intentionally ignoring float here since values like "1.0" are ambiguous in their type (it can be both a string and a number).
 */
function fixObjectType(obj) {
    if (typeof obj !== 'object' || Array.isArray(obj)) {
        return;
    }

    Object.keys(obj).forEach(key => {
        const value = obj[key];

        if (/^[-+]?(\d+|Infinity)$/.test(value)) {
            obj[key] = Number(value);
        } else if (/^(true|false)$/.test(value)) {
            obj[key] = Boolean(value);
        }
    });
}

/**
 * Delete automatically generated url parameters 
 */
function deleteTransientKeys(requestConfig) {
    for (let key of ['sign', 't']) {
        if (requestConfig.hasOwnProperty(key)) {
            delete requestConfig[key];
        }
    }
}

/**
 * Get the global config for all mtop calls 
 */
function extractGlobalConfig(request) {
    const chunks = getDomainChunks(request);
    const globalConfig = {};

    globalConfig.mainDomain = [chunks.pop() || ''];
    if (chunks.length > 0) {
        // Main domain must have at least 2 levels
        globalConfig.mainDomain.unshift(chunks.pop());
    }

    while (chunks.length > 2) {
        globalConfig.mainDomain.unshift(chunks.pop());
    }

    globalConfig.mainDomain = globalConfig.mainDomain.join('.');
    globalConfig.subDomain = chunks.pop() || '';
    globalConfig.prefix = chunks.pop() || '';

    return globalConfig;
}

/**
 * Split the domains in non-empty chunks 
 */
function getDomainChunks(request) {
    const domain = request.urlBase.split('//')[1].split('/')[0];
    return domain.split('.').filter(chunk => typeof chunk === 'string' && chunk.trim().length > 0);
}


/**
 * Extract request `body`
 */
function getBody(request) {
    if (['PUT', 'POST', 'PATCH'].indexOf(request.method) >= 0) {
        return request.jsonBody || {};
    } else {
        return JSON.parse((request.urlParameters || {}).data || '{}');
    }
}


MtopCallGenerator.identifier = "dev.anuragsaini.MtopCallGenerator";
MtopCallGenerator.title = "Mtop Call";
MtopCallGenerator.fileExtension = 'js';
MtopCallGenerator.languageHighlighter = 'javascript';
registerCodeGenerator(MtopCallGenerator)
