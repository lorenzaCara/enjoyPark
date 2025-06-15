import JsonWebToken from "jsonwebtoken";
import prisma from "../prisma/prismaClient.js";

export async function authMiddleware(req, res, next) {
    let token = req.header('Authorization') || '';
    token = token.replace('Bearer ', '');

    //console.log(token);
    try {
        const userFromToken = JsonWebToken.verify(token, process.env.JWT_SECRET);
        const user  = await prisma.user.findUnique({
            where: {
                id: userFromToken.id
            }
        });

        if(!user) {
            throw new Error('user not found!'); //questo mi manda direttamente nel catch
        }

        req.user = user; //in questo modo posso usare req.user in tutte le rotte che hanno authMiddleware. Aggiungo un campo user a req.
    } catch (error) {
        return res.status(401).json({ message: 'Non autenticato!' });
    }
    

    next();
    
}