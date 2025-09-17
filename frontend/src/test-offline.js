// Test script for offline transcription service
const testOfflineTranscription = async () => {
  console.log('Testing offline transcription service...');
  
  try {
    const baseUrl = 'http://localhost:2591';
    // Test health endpoint
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('Health check:', healthData);
    
    // Test model info endpoint
    const modelResponse = await fetch(`${baseUrl}/api/offline/model-info`);
    const modelData = await modelResponse.json();
    console.log('Model info:', modelData);
    
    console.log('All tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
};

// Export for use in browser
if (typeof window !== 'undefined') {
  window.testOfflineTranscription = testOfflineTranscription;
}
