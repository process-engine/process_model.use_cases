import {IIAMService, IIdentity} from '@essential-projects/iam_contracts';

import {ICorrelationService} from '@process-engine/correlation.contracts';
import {IExternalTaskRepository} from '@process-engine/external_task_api_contracts';
import {IFlowNodeInstanceService} from '@process-engine/flow_node_instance.contracts';
import {
  IProcessModelService,
  IProcessModelUseCases,
  Model,
  ProcessDefinitionFromRepository,
} from '@process-engine/process_model.contracts';

export class ProcessModelUseCases implements IProcessModelUseCases {

  private readonly correlationService: ICorrelationService;
  private readonly externalTaskRepository: IExternalTaskRepository;
  private readonly flowNodeInstanceService: IFlowNodeInstanceService;
  private readonly iamService: IIAMService;
  private readonly processModelService: IProcessModelService;

  private canDeleteProcessModel = 'can_delete_process_model';

  constructor(
    correlationService: ICorrelationService,
    // TODO: Must be replaced with the service, as soon as it supports the methods we need here.
    externalTaskRepository: IExternalTaskRepository,
    flowNodeInstanceService: IFlowNodeInstanceService,
    iamService: IIAMService,
    processModelService: IProcessModelService,
  ) {

    this.correlationService = correlationService;
    this.externalTaskRepository = externalTaskRepository;
    this.flowNodeInstanceService = flowNodeInstanceService;
    this.iamService = iamService;
    this.processModelService = processModelService;
  }

  public async getProcessModelByProcessInstanceId(identity: IIdentity, processInstanceId: string): Promise<Model.Process> {

    const correlation = await this.correlationService.getByProcessInstanceId(identity, processInstanceId);

    const correlationProcessModel = correlation.processInstances.pop();

    const processModel = await this.processModelService.getByHash(identity, correlationProcessModel.processModelId, correlationProcessModel.hash);

    return processModel;

  }

  public async deleteProcessModel(identity: IIdentity, processModelId: string): Promise<void> {
    await this.iamService.ensureHasClaim(identity, this.canDeleteProcessModel);

    await this.processModelService.deleteProcessDefinitionById(processModelId);
    await this.correlationService.deleteCorrelationByProcessModelId(identity, processModelId);
    await this.flowNodeInstanceService.deleteByProcessModelId(processModelId);
    // TODO: There should be a service method for this.
    await this.externalTaskRepository.deleteExternalTasksByProcessModelId(processModelId);
  }

  public async persistProcessDefinitions(identity: IIdentity, name: string, xml: string, overwriteExisting?: boolean): Promise<void> {
    return this.processModelService.persistProcessDefinitions(identity, name, xml, overwriteExisting);
  }

  public async getProcessModelById(identity: IIdentity, processModelId: string): Promise<Model.Process> {
    return this.processModelService.getProcessModelById(identity, processModelId);
  }

  public async getProcessDefinitionAsXmlByName(identity: IIdentity, name: string): Promise<ProcessDefinitionFromRepository> {
    return this.processModelService.getProcessDefinitionAsXmlByName(identity, name);
  }

  public async getByHash(identity: IIdentity, processModelId: string, hash: string): Promise<Model.Process> {
    return this.processModelService.getByHash(identity, processModelId, hash);
  }

  public async getProcessModels(identity: IIdentity): Promise<Array<Model.Process>> {
    return this.processModelService.getProcessModels(identity);
  }

}
