'use strict';

const sdk = require('@smartspectra/node-sdk/renderer');
const { decodeMetrics } = require('@smartspectra/node-sdk/messages');

window.SmartSpectra = Object.assign({}, sdk, { decodeMetrics });
