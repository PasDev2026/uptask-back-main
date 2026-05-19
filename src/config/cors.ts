import { CorsOptions } from 'cors';

export const corsConfig: CorsOptions = {
    origin: function (origin, callback) {

        const whiteList = [process.env.FRONTEND_URL]; // Asegúrate de definir FRONTEND_URL en tu archivo de entorno
        
        if(process.argv[2] === '--api') whiteList.push(undefined);

        if (!origin || whiteList.indexOf(origin) !== -1) {
            callback(null, true); // Permitir la conexión
            console.log(`Conexión permitida desde: ${origin}`);
        } else {
            console.error(`Conexión denegada desde: ${origin}`);
            callback(new Error('No se permiten los CORS desde esta origen.'));
        }
    },
};
