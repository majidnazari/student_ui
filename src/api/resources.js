import { http } from "./http";

export const api = {
    list: (resource, params = {}) => http.get(`/${resource}`, { params }),
    show: (resource, id) => http.get(`/${resource}/${id}`),
    create: (resource, payload) => http.post(`/${resource}`, payload),
    update: (resource, id, payload) => http.put(`/${resource}/${id}`, payload),
    remove: (resource, id) => http.delete(`/${resource}/${id}`),

    // Terms
    createTerm: (studentId, payload) => http.post(`/students/${studentId}/terms`, payload),
    updateTerm: (termId, payload) => http.put(`/terms/${termId}`, payload),
    deleteTerm: (termId) => http.delete(`/terms/${termId}`),
};