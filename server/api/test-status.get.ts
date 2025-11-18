export default defineEventHandler(async (event) => {
  return {
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  }
})