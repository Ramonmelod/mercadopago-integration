import fs from "fs";
import path from "path";

function loadTemplate(filename) {
  const filePath = path.join(process.cwd(), "emails", filename);
  return fs.readFileSync(filePath, "utf-8");
}

function applyVariables(template, variables) {
  return template.replace(/{{\s*([\w]+)\s*}}/g, (match, key) => {
    return variables[key] ?? match; // if does not find, keep the text
  });
}
const emailTemplate = {
  loadTemplate,
  applyVariables,
};
export default emailTemplate;
