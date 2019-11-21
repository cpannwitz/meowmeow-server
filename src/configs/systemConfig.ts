const {
  NODE_ENV = 'development',
  ENVIRONMENT = 'development',
  PORT = 3500,
  GSA = '',
  PUSHNOTIFICATION_KEY = '',
  ROLLBAR_TOKEN = '',
} = process.env

export function isEnvDev() {
  return NODE_ENV === 'development'
}
export function isEnvProd() {
  return NODE_ENV === 'production'
}
export function isEnvTest() {
  return NODE_ENV === 'test'
}
const systemConfig = {
  isEnvDev,
  isEnvProd,
  isEnvTest,
  env: NODE_ENV,
  environment: ENVIRONMENT,
  port: PORT,
  globalTimeout: '60s',
  fbServiceAccount: GSA,
  pushNotificationKey: PUSHNOTIFICATION_KEY,
  rollbarToken: ROLLBAR_TOKEN,
}

export default systemConfig
