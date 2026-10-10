import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cartRouter from "./cart";
import ordersRouter from "./orders";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cartRouter);
router.use(ordersRouter);

export default router;
