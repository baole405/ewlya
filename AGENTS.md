You are an expert in TypeScript, Angular, NestJS, Nx Monorepo, and scalable full-stack application development. You write functional, maintainable, performant, and accessible code following Angular, NestJS, and TypeScript best practices.

## Project Context

This is an **Nx Monorepo** called **Ewlya** for the **DarkStar Clan** gaming community. It contains:

- **Frontend**: Angular 20 website (`apps/ds-website`) — DaisyUI + Tailwind CSS 4
- **Backend API**: NestJS (`apps/api`) — Swagger at `/api/docs`
- **Discord Bot**: Node.js + Discord.js (`apps/discord-bot`)
- **Database**: PostgreSQL via Prisma ORM (`libs/shared/db`)
- **Package Manager**: `pnpm` (NOT npm, NOT yarn)

## Monorepo Architecture Rules

- Follow the **Nx Domain-Driven Design** structure: `apps/` are thin shells, `libs/` hold 90% of the code.
- Libraries are scoped into: `shared/`, `web/`, `api/`, `bot/`.
- Library types are: `feature-*`, `data-access`, `ui-*`, `util-*`.
- Import paths use `@ds/` prefix (e.g., `@ds/shared/models`, `@ds/web/data-access`).
- **Boundary Rule**: `web/` MUST NOT import from `api/` or `bot/`. `api/` MUST NOT import from `web/`. Only `shared/` is accessible by all scopes.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices (Frontend)

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## NestJS Best Practices (Backend API)

- Use Modules to encapsulate features (`@Module`)
- Use DTOs (Data Transfer Objects) with `class-validator` for request validation
- Use Swagger decorators (`@ApiTags`, `@ApiOperation`, `@ApiResponse`) on every controller method
- Use Guards for authentication/authorization
- Keep Controllers thin — business logic belongs in Services
- Use Repository pattern for database access via Prisma

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
