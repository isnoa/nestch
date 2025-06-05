export function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function toKebabCase(string: string): string {
  return string
    .replace(/\s+/g, "-")
    .replace(/[A-Z]/g, (match) => "-" + match.toLowerCase())
    .replace(/--+/g, "-")
    .replace(/^(-|$)/g, "");
}

export function isValidResourceName(name: string): boolean {
  const regex = /^[a-zA-Z0-9-_]+$/;
  return regex.test(name);
}
