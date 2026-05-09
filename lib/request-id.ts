export function newRequestId(): string {
  const hex = () => Math.random().toString(16).slice(2, 10);
  return `req_${hex()}${hex()}`;
}
