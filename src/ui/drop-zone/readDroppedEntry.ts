/** 目录读取可能分批返回；持续读取至空批次，保留目录内的遍历顺序。 */
export async function readDroppedEntry(
  entry: FileSystemEntry,
): Promise<File[]> {
  if (entry.isFile) {
    return [
      await new Promise<File>((resolve, reject) => {
        (entry as FileSystemFileEntry).file(resolve, reject);
      }),
    ];
  }
  if (!entry.isDirectory) return [];

  const reader = (entry as FileSystemDirectoryEntry).createReader();
  const files: File[] = [];
  while (true) {
    const entries = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    if (!entries.length) return files;
    const groups = await Promise.all(entries.map(readDroppedEntry));
    for (const group of groups) {
      for (const file of group) files.push(file);
    }
  }
}
