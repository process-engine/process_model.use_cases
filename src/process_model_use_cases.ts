import {IIAMService, IIdentity} from '@essential-projects/iam_contracts';

import {IExternalTaskRepository} from '@process-engine/consumer_api_contracts';
import {ICorrelationService} from '@process-engine/correlation.contracts';
import {IFlowNodeInstanceService} from '@process-engine/flow_node_instance.contracts';
import {
  IProcessModelService,
  IProcessModelUseCases,
  Model,
  ProcessDefinitionFromRepository,
} from '@process-engine/process_model.contracts';

const canDeleteProcessModel = 'can_delete_process_model';
const superAdminClaim = 'can_manage_process_instances';

export class ProcessModelUseCases implements IProcessModelUseCases {

  private readonly correlationService: ICorrelationService;
  private readonly externalTaskRepository: IExternalTaskRepository;
  private readonly flowNodeInstanceService: IFlowNodeInstanceService;
  private readonly iamService: IIAMService;
  private readonly processModelService: IProcessModelService;

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
    await this.ensureUserHasClaim(identity, canDeleteProcessModel);

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

  private async ensureUserHasClaim(identity: IIdentity, claimName: string): Promise<void> {

    const userIsSuperAdmin = await this.checkIfUserIsSuperAdmin(identity);
    if (userIsSuperAdmin) {
      return;
    }

    await this.iamService.ensureHasClaim(identity, claimName);
  }

  private async checkIfUserIsSuperAdmin(identity: IIdentity): Promise<boolean> {
    try {
      await this.iamService.ensureHasClaim(identity, superAdminClaim);

      return true;
    } catch (error) {
      return false;
    }
  }

}
