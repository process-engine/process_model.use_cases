import {IIAMService, IIdentity} from '@essential-projects/iam_contracts';

import {Correlation, CorrelationProcessInstance, ICorrelationService} from '@process-engine/correlation.contracts';
import {IExternalTaskRepository} from '@process-engine/external_task_api_contracts';
import {IFlowNodeInstanceService} from '@process-engine/flow_node_instance.contracts';
import {
  IProcessModelService,
  IProcessModelUseCases,
  Model,
  ProcessDefinitionFromRepository,
} from '@process-engine/process_model.contracts';

export class ProcessModelUseCases implements IProcessModelUseCases {

  private readonly _correlationService: ICorrelationService;
  private readonly _externalTaskRepository: IExternalTaskRepository;
  private readonly _flowNodeInstanceService: IFlowNodeInstanceService;
  private readonly _iamService: IIAMService;
  private readonly _processModelService: IProcessModelService;

  private _canDeleteProcessModel: string = 'can_delete_process_model';

  constructor(
    correlationService: ICorrelationService,
    // TODO: Must be replaced with the service, as soon as it supports the methods we need here.
    externalTaskRepository: IExternalTaskRepository,
    flowNodeInstanceService: IFlowNodeInstanceService,
    iamService: IIAMService,
    processModelService: IProcessModelService,
  ) {

    this._correlationService = correlationService;
    this._externalTaskRepository = externalTaskRepository;
    this._flowNodeInstanceService = flowNodeInstanceService;
    this._iamService = iamService;
    this._processModelService = processModelService;
  }

  public async getProcessModelByProcessInstanceId(identity: IIdentity, processInstanceId: string): Promise<Model.Process> {

    const correlation: Correlation = await this._correlationService.getByProcessInstanceId(identity, processInstanceId);

    const correlationProcessModel: CorrelationProcessInstance = correlation.processModels.pop();

    const processModel: Model.Process =
      await this._processModelService.getByHash(identity, correlationProcessModel.processModelId, correlationProcessModel.hash);

    return processModel;

  }

  public async deleteProcessModel(identity: IIdentity, processModelId: string): Promise<void> {
    await this._iamService.ensureHasClaim(identity, this._canDeleteProcessModel);

    await this._processModelService.deleteProcessDefinitionById(processModelId);
    await this._correlationService.deleteCorrelationByProcessModelId(identity, processModelId);
    await this._flowNodeInstanceService.deleteByProcessModelId(processModelId);
    // TODO: There should be a service method for this.
    await this._externalTaskRepository.deleteExternalTasksByProcessModelId(processModelId);
  }

  public async persistProcessDefinitions(identity: IIdentity, name: string, xml: string, overwriteExisting?: boolean): Promise<void> {
   return this._processModelService.persistProcessDefinitions(identity, name, xml, overwriteExisting);
  }

  public async getProcessModelById(identity: IIdentity, processModelId: string): Promise<Model.Process> {
    return this._processModelService.getProcessModelById(identity, processModelId);
  }

  public async getProcessDefinitionAsXmlByName(identity: IIdentity, name: string): Promise<ProcessDefinitionFromRepository> {
    return this._processModelService.getProcessDefinitionAsXmlByName(identity, name);
  }

  public async getByHash(identity: IIdentity, processModelId: string, hash: string): Promise<Model.Process> {
    return this._processModelService.getByHash(identity, processModelId, hash);
  }

  public async getProcessModels(identity: IIdentity): Promise<Array<Model.Process>> {
    return this._processModelService.getProcessModels(identity);
  }
}
