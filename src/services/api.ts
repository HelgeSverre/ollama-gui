import axios, { AxiosInstance, AxiosResponse } from "axios";

type GenerateCompletionRequest = {
  model: string;
  prompt?: string;
  options?: Record<string, any>;
  system?: string;
  template?: string;
  context?: number[];
};

type GenerateCompletionResponse = {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  sample_count?: number;
  sample_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
  context?: number[];
};

type CreateModelRequest = {
  name: string;
  path: string;
};

type CreateModelResponse = {
  status: string;
};

type ListLocalModelsResponse = {
  models: {
    name: string;
    modified_at: string;
    size: number;
  }[];
};

type ShowModelInformationRequest = {
  name: string;
};

type ShowModelInformationResponse = {
  license: string;
  modelfile: string;
  parameters: string;
  template: string;
};

type CopyModelRequest = {
  source: string;
  destination: string;
};

type CopyModelResponse = {
  status: string;
};

type DeleteModelRequest = {
  model: string;
};

type DeleteModelResponse = {
  status: string;
};

type PullModelRequest = {
  name: string;
  insecure?: boolean;
};

type PullModelResponse = {
  status: string;
  digest: string;
  total: number;
};

type PushModelRequest = {
  name: string;
  insecure?: boolean;
};

type PushModelResponse = {
  status: string;
};

type GenerateEmbeddingsRequest = {
  model: string;
  prompt: string;
  options?: Record<string, any>;
};

type GenerateEmbeddingsResponse = {
  embeddings: number[];
};

// Define the base URL for the API
const API_BASE_URL = "http://localhost:11434/api";

// Create an Axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Define the API client functions

// Generate a completion
const generateCompletion = async (
  request: GenerateCompletionRequest,
): Promise<GenerateCompletionResponse> => {
  const response: AxiosResponse<GenerateCompletionResponse> =
    await apiClient.post("/generate", request);
  return response.data;
};

// Create a model
const createModel = async (
  request: CreateModelRequest,
): Promise<CreateModelResponse> => {
  const response: AxiosResponse<CreateModelResponse> = await apiClient.post(
    "/create",
    request,
  );
  return response.data;
};

// List local models
const listLocalModels = async (): Promise<ListLocalModelsResponse> => {
  const response: AxiosResponse<ListLocalModelsResponse> =
    await apiClient.get("/tags");
  return response.data;
};

// Show model information
const showModelInformation = async (
  request: ShowModelInformationRequest,
): Promise<ShowModelInformationResponse> => {
  const response: AxiosResponse<ShowModelInformationResponse> =
    await apiClient.post("/show", request);
  return response.data;
};

// Copy a model
const copyModel = async (
  request: CopyModelRequest,
): Promise<CopyModelResponse> => {
  const response: AxiosResponse<CopyModelResponse> = await apiClient.post(
    "/copy",
    request,
  );
  return response.data;
};

// Delete a model
const deleteModel = async (
  request: DeleteModelRequest,
): Promise<DeleteModelResponse> => {
  const response: AxiosResponse<DeleteModelResponse> = await apiClient.delete(
    "/delete",
    { data: request },
  );
  return response.data;
};

// Pull a model
const pullModel = async (
  request: PullModelRequest,
): Promise<PullModelResponse> => {
  const response: AxiosResponse<PullModelResponse> = await apiClient.post(
    "/pull",
    request,
  );
  return response.data;
};

// Push a model
const pushModel = async (
  request: PushModelRequest,
): Promise<PushModelResponse> => {
  const response: AxiosResponse<PushModelResponse> = await apiClient.post(
    "/push",
    request,
  );
  return response.data;
};

// Generate embeddings
const generateEmbeddings = async (
  request: GenerateEmbeddingsRequest,
): Promise<GenerateEmbeddingsResponse> => {
  const response: AxiosResponse<GenerateEmbeddingsResponse> =
    await apiClient.post("/embeddings", request);
  return response.data;
};

export default {
  generateCompletion,
  createModel,
  listLocalModels,
  showModelInformation,
  copyModel,
  deleteModel,
  pullModel,
  pushModel,
  generateEmbeddings,
};
