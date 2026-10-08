/**
 * Express 异步路由的错误转发包装。
 * 控制器抛出的 Promise 异常会自动交给全局错误中间件，路由不必重复 try/catch。
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express'

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>

// 把异步路由异常交给 Express 统一错误处理。
export function asyncHandler(handler: AsyncRouteHandler): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next)
  }
}
