import mongoose from "mongoose";
import {exit} from 'node:process';

export const connectDB = async() => {
    try {
        const conecction = await mongoose.connect(process.env.DATABASE_URL || '');
        console.log(`Conexion exitosa con la base de datos ${conecction.connection.host}`);
        return conecction;
    } catch (error: any ) {
        console.log(error.message);
        exit(1)
    }
}

