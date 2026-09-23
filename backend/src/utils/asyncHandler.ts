import type { NextFunction, Request, RequestHandler, Response } from 'express'

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>

// 负责 asyncHandler 的业务处理。
export function asyncHandler(handler: AsyncRouteHandler): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next)
  }
}
