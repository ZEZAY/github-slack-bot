import * as dotenv from 'dotenv';
dotenv.config();

import { app } from './server';

(async () => {
    app.listen(process.env.PORT || 8000, () => {
        console.log('app is running');
    });
})();
