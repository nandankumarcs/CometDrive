import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import FormData = require('form-data');

const API_URL = 'http://localhost:3001/api/v1'; // Updated to match actual prefix
const ADMIN_EMAIL = 'admin@comet.com';
const ADMIN_PASSWORD = 'password123';

async function main() {
  try {
    console.log('🚀 Starting Phase 2 Verification...');

    // 1. Auth: Login
    console.log('\n🔐 Authenticating...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    const token = loginRes.data.data.accessToken;
    console.log('✅ Logged in successfully.');

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Folder: Create Root
    console.log('\n📂 Creating Root Folder...');
    const rootFolderRes = await axios.post(
      `${API_URL}/folders`,
      { name: 'Verification Root' },
      { headers },
    );
    const rootFolder = rootFolderRes.data.data;
    console.log(`✅ Created Root Folder: ${rootFolder.name} (${rootFolder.uuid})`);

    // 3. Folder: Create Subfolder
    console.log('\n📂 Creating Subfolder...');
    const subFolderRes = await axios.post(
      `${API_URL}/folders`,
      { name: 'Verification Sub', parentUuid: rootFolder.uuid },
      { headers },
    );
    const subFolder = subFolderRes.data.data;
    console.log(`✅ Created Subfolder: ${subFolder.name} (${subFolder.uuid})`);

    // 4. File: Upload File
    console.log('\n📄 Uploading File...');
    const formData = new FormData();
    const filePath = path.join(__dirname, 'test-file.txt');
    fs.writeFileSync(filePath, 'This is a test file for verification.');

    formData.append('file', fs.createReadStream(filePath));
    formData.append('folderUuid', subFolder.uuid);

    const uploadRes = await axios.post(`${API_URL}/files/upload`, formData, {
      headers: {
        ...headers,
        ...formData.getHeaders(),
      },
    });
    const file = uploadRes.data.data;
    console.log(`✅ Uploaded File: ${file.name} (${file.uuid}) in ${subFolder.name}`);

    // Clean up local test file
    fs.unlinkSync(filePath);

    // 5. Verification: Check Hierarchy
    console.log('\n🔍 Verifying Hierarchy...');
    const folderListRes = await axios.get(`${API_URL}/folders?parentUuid=${rootFolder.uuid}`, {
      headers,
    });
    const subFolders = folderListRes.data.data;
    const foundSub = subFolders.find((f: any) => f.uuid === subFolder.uuid);
    if (!foundSub) throw new Error('Subfolder not found in root folder');
    console.log('✅ Hierarchy verified: Subfolder exists in Root.');

    const fileListRes = await axios.get(`${API_URL}/files?folderUuid=${subFolder.uuid}`, {
      headers,
    });
    const files = fileListRes.data.data;
    const foundFile = files.find((f: any) => f.uuid === file.uuid);
    if (!foundFile) throw new Error('File not found in subfolder');
    console.log('✅ Hierarchy verified: File exists in Subfolder.');

    // 6. Trash: Folder
    console.log('\n🗑️ Trashing Root Folder...');
    await axios.delete(`${API_URL}/folders/${rootFolder.uuid}`, { headers });

    // Default view shouldn't show it
    const listResAfterTrash = await axios.get(`${API_URL}/folders`, { headers });
    const foundTrashed = listResAfterTrash.data.data.find((f: any) => f.uuid === rootFolder.uuid);
    if (foundTrashed) throw new Error('Trashed folder still visible in main view');
    console.log('✅ Root folder removed from main view.');

    // Trash view should show it
    const trashRes = await axios.get(`${API_URL}/folders?isTrashed=true`, { headers });
    const foundInTrash = trashRes.data.data.find((f: any) => f.uuid === rootFolder.uuid);
    if (!foundInTrash) throw new Error('Trashed folder not found in trash view');
    console.log('✅ Root folder found in trash view.');

    // 7. Restore
    console.log('\n♻️ Restoring Root Folder...');
    await axios.post(`${API_URL}/folders/${rootFolder.uuid}/restore`, {}, { headers });
    const listResAfterRestore = await axios.get(`${API_URL}/folders`, { headers });
    const foundRestored = listResAfterRestore.data.data.find(
      (f: any) => f.uuid === rootFolder.uuid,
    );
    if (!foundRestored) throw new Error('Restored folder not visible in main view');
    console.log('✅ Root folder restored successfully.');

    // 8. Delete Permanently
    console.log('\n❌ Deleting Permanently...');
    // Traverse details to clean up: Trash first then delete permanent
    await axios.delete(`${API_URL}/folders/${rootFolder.uuid}`, { headers }); // Trash first
    await axios.delete(`${API_URL}/folders/${rootFolder.uuid}/permanent`, { headers }); // Permanent

    console.log('✅ Root folder deleted permanently.');

    console.log('\n🎉 PHASE 2 VERIFICATION COMPLETE: ALL CHECKS PASSED');
  } catch (error: any) {
    console.error('❌ Verification Failed:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error Details:', error);
    }
    process.exit(1);
  }
}

main();
