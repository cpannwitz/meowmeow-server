const corsWhitelist = [
  /localhost/,
  /meowmeow\.rocks/,
  /meowcards\.netlify\.com/,
  /meowcards\.herokuapp\.com/,
]
const corsConfig = {
  credentials: true,
  optionsSuccessStatus: 200,
  origin: corsWhitelist,
}

export default corsConfig
