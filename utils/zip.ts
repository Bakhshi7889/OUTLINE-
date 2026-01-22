import JSZip from 'jszip';

export const createZip = async (files: Array<{name: string, content: string}>): Promise<Blob> => {
  const zip = new JSZip();
  
  files.forEach(file => {
    zip.file(file.name, file.content);
  });

  const blob = await zip.generateAsync({ type: "blob" });
  return blob;
};