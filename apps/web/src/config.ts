// Global Feature Flags for Production Readiness
// When true, production Sign Up and Sign In links appear in headers/footers.
// Set to false for the demo-first public release.
export const SHOW_PRODUCTION_AUTH = ((import.meta as any).env?.VITE_SHOW_PRODUCTION_AUTH === 'true');
