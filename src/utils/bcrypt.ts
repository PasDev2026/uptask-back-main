import bcrypt from 'bcrypt'

export const hashPassword = async (password: string) =>{
     //Hash password
     const salt = await bcrypt.genSalt(10)
     return password = await bcrypt.hash(password, salt)
}

//confirmar que el password es el mismo que esta hasheado
export const checkPassword = async(enteredPassword: string, storedHash: string) => {
     return await bcrypt.compare(enteredPassword, storedHash)
}