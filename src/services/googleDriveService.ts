export interface DriveBackupFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
}

/**
 * List school backup files created in Google Drive with the app
 */
export const listSchoolBackupsFromDrive = async (accessToken: string): Promise<DriveBackupFile[]> => {
  const query = encodeURIComponent("name contains 'SJKC_Alor_Pongsu' and trashed = false");
  const fields = encodeURIComponent('files(id, name, modifiedTime, size, webViewLink)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime%20desc&fields=${fields}&pageSize=20`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Drive list error:', errText);
    throw new Error(`Ralat mendapatkan senarai fail dari Google Drive (${response.status})`);
  }

  const result = await response.json();
  return result.files || [];
};

/**
 * Upload a new backup JSON to Google Drive using multipart upload
 */
export const uploadBackupToDrive = async (
  accessToken: string,
  backupData: any,
  customFileName?: string
): Promise<DriveBackupFile> => {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = customFileName || `SJKC_Alor_Pongsu_Sandaran_${dateStr}.json`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: 'Fail Sandaran Rasmi Rekod Semakan Buku SJK(C) Alor Pongsu',
  };

  const fileContent = JSON.stringify(backupData, null, 2);

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error('Drive upload error:', errText);
    throw new Error(`Gagal memuat naik fail ke Google Drive (${response.status})`);
  }

  const uploaded = await response.json();
  return uploaded;
};

/**
 * Read backup content from Google Drive
 */
export const downloadBackupFromDrive = async (
  accessToken: string,
  fileId: string
): Promise<any> => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Drive download error:', errText);
    throw new Error(`Gagal memuat turun data dari Google Drive (${response.status})`);
  }

  const data = await response.json();
  return data;
};

/**
 * Delete a backup file from Google Drive (Requires explicit confirmation from user)
 */
export const deleteBackupFromDrive = async (
  accessToken: string,
  fileId: string
): Promise<void> => {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const errText = await response.text();
    console.error('Drive delete error:', errText);
    throw new Error(`Gagal memadam fail dari Google Drive (${response.status})`);
  }
};
