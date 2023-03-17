import Emittery from "emittery";

type ErrorServiceEvents = {
  handlerError: { message: string; error: Error };
  handlerErrorCleared: undefined;
};

export class ErrorService extends Emittery<ErrorServiceEvents> {
  isHandlerError = false;

  submitHandlerError({ message, error }: { message: string; error: Error }) {
    this.isHandlerError = true;
    this.emit("handlerError", { message, error });
  }

  clearHandlerError() {
    this.isHandlerError = false;
    this.emit("handlerErrorCleared");
  }
}
