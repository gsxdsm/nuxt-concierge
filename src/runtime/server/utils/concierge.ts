import { Queue, Worker } from "bullmq";
import { useLogger } from "@nuxt/kit";

import type {
  WorkerOptions,
  ConnectionOptions,
  QueueOptions,
  RedisOptions,
  Processor,
} from "bullmq";
import { useRuntimeConfig } from "#imports";

const logger = useLogger("@nuxtjs/concierge");

const queues: Queue[] = [];
const workers: Worker[] = [];

export const $concierge = () => {
  const {
    concierge: {
      redis: { host, password, port },
    },
  } = useRuntimeConfig();

  const redisOptions: RedisOptions = {
    host,
    password,
    port,
    retryStrategy: function (times: number) {
      return Math.max(Math.min(Math.exp(times), 20000), 1000);
    },
  };

  const createQueue = (
    name: string,
    opts?: Omit<QueueOptions, "connection">
  ) => {
    const defaultConnectionOptions: ConnectionOptions = {
      enableOfflineQueue: false,
    };

    queues.push(
      new Queue(name, {
        connection: { ...redisOptions, ...defaultConnectionOptions },
        ...opts,
      })
    );
  };

  const createWorker = (
    name: string,
    processor?: string | URL | null | Processor,
    opts?: Omit<WorkerOptions, "connection">
  ) => {
    const defaultConnectionOptions: ConnectionOptions = {
      enableOfflineQueue: true,
      maxRetriesPerRequest: null,
    };

    workers.push(
      new Worker(name, processor, {
        connection: { ...redisOptions, ...defaultConnectionOptions },
        ...opts,
      }).on("closed", () => {
        logger.info(`Worker ${name} stopped`);
      })
    );
  };

  return {
    queues,
    workers,
    createQueue,
    createWorker,
  };
};