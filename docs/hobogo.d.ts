/* tslint:disable */
export function game_over(arg0: Int8Array, arg1: number): boolean;

export function ai_move(arg0: Int8Array, arg1: number, arg2: number): JsCoord;

export function volatile_cells(arg0: Int8Array, arg1: number): Uint8Array;

export class JsCoord {
free(): void;
x: number
y: number

}
