// An error that carries an HTTP status code.
// Route handlers `throw new HttpError(404, 'Not found')`, and the central error
// handler in app.js turns it into a JSON response.
export default class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.expose = true; // safe to show this message to the client
  }
}
