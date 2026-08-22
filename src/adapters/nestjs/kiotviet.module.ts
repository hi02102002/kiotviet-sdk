import type { DynamicModule, Provider, Type } from '@nestjs/common';
import type { KiotVietClientConfig } from '../../types/common';
import { Global, Module } from '@nestjs/common';
import { KiotVietClient } from '../../client';
import { KIOTVIET_CLIENT, KIOTVIET_OPTIONS } from './tokens';

/**
 * Factory interface for `KiotVietModule.registerAsync({ useClass | useExisting })`.
 */
export interface KiotVietOptionsFactory {
  createKiotVietOptions: () => Promise<KiotVietClientConfig> | KiotVietClientConfig;
}

export interface KiotVietModuleAsyncOptions {
  imports?: Array<Type<any> | DynamicModule | Promise<DynamicModule> | any>;
  inject?: any[];
  useFactory?: (...args: any[]) => Promise<KiotVietClientConfig> | KiotVietClientConfig;
  useExisting?: Type<KiotVietOptionsFactory>;
  useClass?: Type<KiotVietOptionsFactory>;
}

/**
 * Global NestJS module providing a shared {@link KiotVietClient}.
 *
 * @example
 * ```typescript
 * @Module({ imports: [KiotVietModule.register({
 *   clientId: process.env.KIOTVIET_CLIENT_ID!,
 *   clientSecret: process.env.KIOTVIET_CLIENT_SECRET!,
 *   retailerName: 'my-retailer',
 * })] })
 * export class AppModule {}
 *
 * @Injectable()
 * export class ProductsService {
 *   constructor(@InjectKiotViet() private readonly kiotviet: KiotVietClient) {}
 *   list() { return this.kiotviet.products.list({ pageSize: 10 }); }
 * }
 * ```
 */
@Global()
@Module({})
export class KiotVietModule {
  /** Register the module with a static config. */
  static register(config: KiotVietClientConfig): DynamicModule {
    return {
      module: KiotVietModule,
      global: true,
      providers: [
        { provide: KIOTVIET_OPTIONS, useValue: config },
        KiotVietModule.createClientProvider(),
        { provide: KIOTVIET_CLIENT, useExisting: KiotVietClient },
      ],
      exports: [KiotVietClient, KIOTVIET_CLIENT, KIOTVIET_OPTIONS],
    };
  }

  /** Register the module with an async config factory (e.g. using ConfigService). */
  static registerAsync(options: KiotVietModuleAsyncOptions): DynamicModule {
    return {
      module: KiotVietModule,
      global: true,
      imports: options.imports,
      providers: [
        ...KiotVietModule.createAsyncOptionsProviders(options),
        KiotVietModule.createClientProvider(),
        { provide: KIOTVIET_CLIENT, useExisting: KiotVietClient },
      ],
      exports: [KiotVietClient, KIOTVIET_CLIENT, KIOTVIET_OPTIONS],
    };
  }

  private static createClientProvider(): Provider {
    return {
      provide: KiotVietClient,
      useFactory: (config: KiotVietClientConfig) => new KiotVietClient(config),
      inject: [KIOTVIET_OPTIONS],
    };
  }

  private static createAsyncOptionsProviders(options: KiotVietModuleAsyncOptions): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: KIOTVIET_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject,
        },
      ];
    }

    const factoryDependency = options.useExisting ?? options.useClass;
    if (!factoryDependency) {
      throw new Error('KiotVietModule.registerAsync requires one of useFactory, useExisting or useClass');
    }

    const providers: Provider[] = [
      {
        provide: KIOTVIET_OPTIONS,
        useFactory: (factory: KiotVietOptionsFactory) => factory.createKiotVietOptions(),
        inject: [factoryDependency],
      },
    ];

    if (options.useClass) {
      providers.unshift({ provide: options.useClass, useClass: options.useClass });
    }

    return providers;
  }
}
