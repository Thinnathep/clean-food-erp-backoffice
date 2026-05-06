
import fs from 'fs';

const filePath = 'd:/VS CODE/CL FOOD CR erp_backoffice/erp_backoffice/src/store/kdsStore.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix box_size assignment
content = content.replace(/box_size: 'regular',/g, 'box_size: boxSize,');

fs.writeFileSync(filePath, content);
console.log('File updated successfully');
