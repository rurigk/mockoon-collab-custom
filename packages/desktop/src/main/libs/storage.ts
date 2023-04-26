import {
  DataOptions,
  get as storageGet,
  set as storageSet
} from 'electron-json-storage';
import { parse as pathParse } from 'path';
import { promisify } from 'util';
import * as Path from 'path';
import * as fs from 'fs';

/**
 * Read JSON data from a file.
 * Path can either be a full relative or absolute path, or a key.
 * (see electron-json-storage for more info)
 *
 * @param path
 * @returns
 */
export const readJSONData = async (path: string) => {
  const options: DataOptions = { dataPath: '' };

  const parsedPath = pathParse(path);

  if (parsedPath.dir) {
    options.dataPath = parsedPath.dir;
  }

  try {
    const data = await promisify<string, DataOptions, any>(storageGet)(
      parsedPath.name,
      options
    );

    // if object is empty return null instead (electron json storage returns empty object if file does not exists)
    if (
      !data ||
      (Object.keys(data).length === 0 && data.constructor === Object)
    ) {
      return null;
    }

    load_preprocess(path, data);

    return data;
  } catch (error) {
    // if file empty (JSON.parse error), it will throw
    return null;
  }
};

/**
 * Write JSON data to a file, eventually pretty printed.
 * Path can either be a full relative or absolute path, or a key.
 * (see electron-json-storage for more info)
 *
 * @param data
 * @param path
 * @param storagePrettyPrint
 * @returns
 */
export const writeJSONData = async (
  data: any,
  path: string,
  storagePrettyPrint?: boolean
) => {
  save_preprocess(path, data);

  const options: DataOptions & { prettyPrinting?: boolean } = {
    dataPath: '',
    prettyPrinting: storagePrettyPrint
  };

  const parsedPath = pathParse(path);

  if (parsedPath.dir) {
    options.dataPath = parsedPath.dir;
  }

  return await promisify<string, any, DataOptions>(storageSet)(
    parsedPath.name,
    data,
    options
  );
};

function save_preprocess (path: string, data: any) {
  if (
    typeof data.routes != "undefined" && 
    typeof data.rootChildren != "undefined" &&
    typeof data.folders != "undefined"
  ) {
    let filePath = Path.parse(path);
    let fileDirPath = filePath.dir;
    let fileNameWithoutExtension = filePath.name;

    check_artifiacts_folder(fileDirPath, fileNameWithoutExtension);

    let routes = data.routes;
    let rootChildren = data.rootChildren;
    let folders = data.folders;

    save_routes(fileDirPath, fileNameWithoutExtension, routes);
    save_rootchildren(fileDirPath, fileNameWithoutExtension, rootChildren);
    save_folders(fileDirPath, fileNameWithoutExtension, folders);

    data.routes = [];
    data.rootChildren = [];
    data.folders = [];
  }
}

function load_preprocess(path: string, data: any) {
  if (typeof data.routes != "undefined" && typeof data.rootChildren != "undefined") {
    try{
      let filePath = Path.parse(path);
      let fileDirPath = filePath.dir;
      let fileNameWithoutExtension = filePath.name;

      let routes = load_routes(fileDirPath, fileNameWithoutExtension);
      let rootChildren = load_rootchildren(fileDirPath, fileNameWithoutExtension);
      let folders = load_folders(fileDirPath, fileNameWithoutExtension);
  
      data.routes = data.routes.concat(routes);
      data.rootChildren = data.rootChildren.concat(rootChildren);
      data.folders = data.folders.concat(folders);
    } catch(e) {
      console.log(e);
    }
  }
}

function save_routes(dir: string, filename: string, data: any) {
  let artifacts_path = `${dir}/${filename}.artifacts/routes`;
  save_array_data(artifacts_path, data);
}

function load_routes(dir: string, filename: string) : [any] {
  let artifacts_path = `${dir}/${filename}.artifacts/routes`;
  return load_data_to_array(artifacts_path);
}

function save_rootchildren(dir: string, filename: string, data: any) {
  let artifacts_path = `${dir}/${filename}.artifacts/rootchildren`;
  save_array_data(artifacts_path, data);
}

function load_rootchildren(dir: string, filename: string) : [any] {
  let artifacts_path = `${dir}/${filename}.artifacts/rootchildren`;
  return load_data_to_array(artifacts_path);
}

function save_folders(dir: string, filename: string, data: any) {
  let artifacts_path = `${dir}/${filename}.artifacts/folders`;
  save_array_data(artifacts_path, data);
}

function load_folders(dir: string, filename: string) : [any] {
  let artifacts_path = `${dir}/${filename}.artifacts/folders`;
  return load_data_to_array(artifacts_path);
}

function save_array_data (dir: string, rootChildrens: any) {
  rootChildrens.forEach((element: any) => {
    let id = element.uuid;
    let element_str = JSON.stringify(element);

    fs.writeFileSync(`${dir}/${id}.json`, element_str);
  });
}

function load_data_to_array(path: string) : [any] {
  let data_array: any = [];
  let files;
  try {
    files = fs.readdirSync(path);
  } catch (e) {
    return data_array;
  }

  files.forEach(file_name => {
    let file_data = JSON.parse(fs.readFileSync(`${path}/${file_name}`).toString());
    data_array.push(file_data);
  });

  return data_array;
}

function check_artifiacts_folder(dir: string, filename: string) {
  let artifacts_path = `${dir}/${filename}.artifacts`;
  let artifacts_routes_path = `${dir}/${filename}.artifacts/routes`;
  let artifacts_rootChildren_path = `${dir}/${filename}.artifacts/rootchildren`;
  let artifacts_folders_path = `${dir}/${filename}.artifacts/folders`;

  if (!fs.existsSync(artifacts_path)) {
    fs.mkdirSync(artifacts_path)
  }

  if (!fs.existsSync(artifacts_routes_path)) {
    fs.mkdirSync(artifacts_routes_path)
  }

  if (!fs.existsSync(artifacts_rootChildren_path)) {
    fs.mkdirSync(artifacts_rootChildren_path)
  }

  if (!fs.existsSync(artifacts_folders_path)) {
    fs.mkdirSync(artifacts_folders_path)
  }
}