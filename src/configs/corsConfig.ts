const corsWhitelist = [/localhost/, /meowcards\.netlify\.com/, /meowcards\.herokuapp\.com/]
const corsConfig = {
  credentials: true,
  optionsSuccessStatus: 200,
  origin: corsWhitelist,
}

export default corsConfig
