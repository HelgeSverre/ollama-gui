// Test Connection
const testConnection = async (): Promise<Boolean>=> {
    const response = await fetch("http://localhost:11434/")
    return response.ok
  }

export default testConnection