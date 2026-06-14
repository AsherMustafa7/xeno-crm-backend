import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getCustomers = (params) => api.get('/customers', { params })
export const getCustomerStats = () => api.get('/customers/stats')
export const getCustomer = (id) => api.get(`/customers/${id}`)

export const getSegments = () => api.get('/segments')
export const previewSegment = (data) => api.post('/segments/preview', data)
export const createSegment = (data) => api.post('/segments', data)
export const getSegmentCustomers = (id) => api.get(`/segments/${id}/customers`)

export const getCampaigns = () => api.get('/campaigns')
export const getCampaign = (id) => api.get(`/campaigns/${id}`)
export const createCampaign = (data) => api.post('/campaigns', data)
export const sendCampaign = (id) => api.post(`/campaigns/${id}/send`)
export const getCampaignComms = (id) => api.get(`/campaigns/${id}/communications`)

export const getDashboard = () => api.get('/analytics/dashboard')

export const aiParseSegment = (natural_language) =>
  api.post('/ai/parse-segment', { natural_language })

export const aiDraftMessage = (data) => api.post('/ai/draft-message', data)

export default api
