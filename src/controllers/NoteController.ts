import type { Request, Response } from "express"
import Note, {INote} from "../model/Note"
import { Types } from "mongoose"
// <> -> Generics
//el generic sirve para esperar que tipo de dato recibo en mi req.body

type NoteParams = {
    noteId: Types.ObjectId
}


export class NoteController {


    static createNote = async (req:Request<{},{}, INote>, res : Response) => {
        //res.send('creando nota..')
        const { content } = req.body
        
        const note = new Note()
        note.content = content
        note.createdBy = req.user.id
        note.task = req.task.id

        req.task.notes.push(note.id)

        try {
            await Promise.allSettled([req.task.save(), note.save()])
            res.send('Nota creada correctamente')
        } catch (error) {
            res.status(500).json({message: 'Hubo un error'})
        }
    }

    static getTaskNotes = async (req:Request<{},{}, INote>, res : Response) => {
        try {
            const notes = await Note.find({task: req.task.id}) //trayendo una tarea
            res.json(notes)
        } catch (error) {
            
        }
    
    }

    static deleteNote = async (req:Request<NoteParams>, res : Response) => {
        const {noteId} = req.params
        const note = await Note.findById(noteId)
        
        if(!note){
            const error = new Error('No existe la nota')
            res.status(404).json({error: error.message});
            return
        }

        if(note.createdBy.toString() !== req.user.id.toString()){  //si la persona quien lo creo es diferente a la persona que está autenteicado
            const error = new Error('Accion no válida')
            res.status(404).json({error: error.message});
        }

        req.task.notes = req.task.notes.filter(note => note.toString() !== noteId.toString())   

        try {
            await Promise.allSettled([req.task.save(), note.deleteOne()])
            res.send('Nota eliminada correctamente')
        } catch (error) {
            
        }

    }

}