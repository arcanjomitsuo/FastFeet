import { Router } from 'express';

import multer from 'multer';
import multerConfig from './config/multer';

import SessionController from './app/controllers/SessionController';
import RecipientController from './app/controllers/RecipientController';
import FileController from './app/controllers/FileController';

import authMiddleware from './app/middlewares/auth';

const routes = new Router();
const upload = multer(multerConfig);

routes.post('/sessions', SessionController.store);

routes.use(authMiddleware); // ***todas as rotas abaixo deverão estar autenticados com token.

routes.post('/files', upload.single('file'), FileController.store); // Upload de arquivos

// Rotas de destinatarios
routes.post('/recipients', RecipientController.store);
routes.put('/recipients/:id', RecipientController.update);
routes.get('/recipients', RecipientController.index);
routes.delete('/recipients/:id', RecipientController.delete);

export default routes;
