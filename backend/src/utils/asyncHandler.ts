import type { NextFunction, Request, RequestHandler, Response } from 'express'

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>

// 把异步路由异常交给 Express 统一错误处理。
export function asyncHandler(handler: AsyncRouteHandler): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next)
  }
}
