const testConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch("http://localhost:11434/");
    return response.ok;
  } catch (error) {
    console.error("Connection failed:", error);
    return false;
  }
};

export default testConnection;
