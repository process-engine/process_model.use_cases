'use strict';

const {ProcessModelUseCases} = require('./dist/commonjs/index');

function registerInContainer(container) {
  container
    .register('ProcessModelUseCases', ProcessModelUseCases)
    .dependencies('CorrelationService', 'ExternalTaskRepository', 'FlowNodeInstanceService', 'IamService', 'ProcessModelService')
    .singleton();
}

module.exports.registerInContainer = registerInContainer;
