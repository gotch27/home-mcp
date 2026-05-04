import { emailService } from "@/nextsignal/services/email";
import { shoppingService } from "@/nextsignal/services/shopping";
import { todosService } from "@/nextsignal/services/todos";

export type HealthSnapshot = {
  status: "ok";
  appName: string;
  checkedAt: string;
};

// Services are the app-owned data and integration layer.
//
// Put database repositories, ORM clients, API clients, mailers, and other
// infrastructure here. NextSignal should not know or care whether you use
// Drizzle, Prisma, raw SQL, Redis, S3, or anything else.
export const services = {
  health: {
    async check(appName: string): Promise<HealthSnapshot> {
      return {
        status: "ok",
        appName,
        checkedAt: new Date().toISOString()
      };
    }
  },
  shopping: shoppingService,
  todos: todosService,
  email: emailService
};

export type AppServices = typeof services;
