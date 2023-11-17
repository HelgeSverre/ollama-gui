import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { ref } from 'vue'

export type GenerateCompletionRequest = {
  model: string
  prompt?: string
  options?: Record<string, any>
  system?: string
  template?: string
  context?: number[]
}

export type GenerateCompletionCompletedResponse = {
  model: string
  created_at: string
  response: string
  done: boolean
  total_duration: number
  load_duration: number
  sample_count: number
  sample_duration: number
  prompt_eval_count: number
  prompt_eval_duration: number
  eval_count: number
  eval_duration: number
  context: number[]
}
export type GenerateCompletionPartResponse = {
  model: string
  created_at: string
  response: string
  done: boolean
}

export type GenerateCompletionResponse =
  | GenerateCompletionCompletedResponse
  | GenerateCompletionPartResponse

export type CreateModelRequest = {
  name: string
  path: string
}

export type CreateModelResponse = {
  status: string
}

export type Model = {
  name: string
  modified_at: string
  size: number
}
export type ListLocalModelsResponse = {
  models: Model[]
}

export type ShowModelInformationRequest = {
  name: string
}

export type ShowModelInformationResponse = {
  license: string
  modelfile: string
  parameters: string
  template: string
}

export type CopyModelRequest = {
  source: string
  destination: string
}

export type CopyModelResponse = {
  status: string
}

export type DeleteModelRequest = {
  model: string
}

export type DeleteModelResponse = {
  status: string
}

export type PullModelRequest = {
  name: string
  insecure?: boolean
}

export type PullModelResponse = {
  status: string
  digest: string
  total: number
}

export type PushModelRequest = {
  name: string
  insecure?: boolean
}

export type PushModelResponse = {
  status: string
}

export type GenerateEmbeddingsRequest = {
  model: string
  prompt: string
  options?: Record<string, any>
}

export type GenerateEmbeddingsResponse = {
  embeddings: number[]
}

// Define the base URL for the API
const API_BASE_URL = 'http://localhost:11434/api'

// Create an Axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Define the API client functions

export const useApi = () => {
  const error = ref(null)

  const generateCompletion = async (
    request: GenerateCompletionRequest,
    onDataReceived: (data: GenerateCompletionResponse) => void,
  ): Promise<GenerateCompletionResponse[]> => {
    return new Promise(async (resolve, reject) => {
      try {
        const res = await fetch(`${API_BASE_URL}/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        })

        if (!res.ok) {
          reject('Network response was not ok')
          return
        }

        const reader = res.body?.getReader()
        let results: GenerateCompletionResponse[] = []

        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              break
            }

            const chunk = new TextDecoder().decode(value)
            const parsedChunk: GenerateCompletionPartResponse = JSON.parse(chunk)

            onDataReceived(parsedChunk)
            results.push(parsedChunk)
          }
        }

        resolve(results)
      } catch (err) {
        reject(err)
      }
    })
  }

  // Create a model
  const createModel = async (
    request: CreateModelRequest,
  ): Promise<CreateModelResponse> => {
    const response: AxiosResponse<CreateModelResponse> = await apiClient.post(
      '/create',
      request,
    )
    return response.data
  }

  // List local models
  const listLocalModels = async (): Promise<ListLocalModelsResponse> => {
    const response: AxiosResponse<ListLocalModelsResponse> = await apiClient.get('/tags')
    return response.data
  }

  // Show model information
  const showModelInformation = async (
    request: ShowModelInformationRequest,
  ): Promise<ShowModelInformationResponse> => {
    const response: AxiosResponse<ShowModelInformationResponse> = await apiClient.post(
      '/show',
      request,
    )
    return response.data
  }

  // Copy a model
  const copyModel = async (request: CopyModelRequest): Promise<CopyModelResponse> => {
    const response: AxiosResponse<CopyModelResponse> = await apiClient.post(
      '/copy',
      request,
    )
    return response.data
  }

  // Delete a model
  const deleteModel = async (
    request: DeleteModelRequest,
  ): Promise<DeleteModelResponse> => {
    const response: AxiosResponse<DeleteModelResponse> = await apiClient.delete(
      '/delete',
      { data: request },
    )
    return response.data
  }

  // Pull a model
  const pullModel = async (request: PullModelRequest): Promise<PullModelResponse> => {
    const response: AxiosResponse<PullModelResponse> = await apiClient.post(
      '/pull',
      request,
    )
    return response.data
  }

  // Push a model
  const pushModel = async (request: PushModelRequest): Promise<PushModelResponse> => {
    const response: AxiosResponse<PushModelResponse> = await apiClient.post(
      '/push',
      request,
    )
    return response.data
  }

  // Generate embeddings
  const generateEmbeddings = async (
    request: GenerateEmbeddingsRequest,
  ): Promise<GenerateEmbeddingsResponse> => {
    const response: AxiosResponse<GenerateEmbeddingsResponse> = await apiClient.post(
      '/embeddings',
      request,
    )
    return response.data
  }

  return {
    error,
    generateCompletion,
    createModel,
    listLocalModels,
    showModelInformation,
    copyModel,
    deleteModel,
    pullModel,
    pushModel,
    generateEmbeddings,
  }
}
