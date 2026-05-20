import bcrypt from 'bcrypt'

async function main() {
  const password = '12345678'
  
  const salt = await bcrypt.genSalt(10)
  const hashedPassword = await bcrypt.hash(password, salt)

  console.log(hashedPassword)
}

main()