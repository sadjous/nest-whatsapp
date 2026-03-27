import { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';
import * as ts from '@schematics/angular/third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { addSymbolToNgModuleMetadata, insertImport } from '@schematics/angular/utility/ast-utils';
import { InsertChange, Change } from '@schematics/angular/utility/change';

interface Options {
  module: string;
  mode: 'sandbox' | 'live';
  addHealth: boolean;
  addMicro: boolean;
  host: string;
  port: number;
  testPhoneNumberId?: string;
  temporaryAccessToken?: string;
  testRecipients?: string[];
  businessAccountId?: string;
  phoneNumberId?: string;
  accessToken?: string;
}

export function whatsapp(options: Options): Rule {
  return (tree: Tree, _context: SchematicContext) => {
    const modulePath = options.module || 'src/app.module.ts';
    const buffer = tree.read(modulePath);
    if (!buffer) {
      throw new Error(`${modulePath} not found`);
    }
    const content = buffer.toString('utf-8');
    const sourceFile = ts.createSourceFile(modulePath, content, ts.ScriptTarget.Latest, true);

    // Ensure imports exist
    const importChanges: Change[] = [];
    const maybeImport = (symbol: string, file: string) => {
      const change = insertImport(sourceFile, modulePath, symbol, file);
      if (change) importChanges.push(change);
    };
    maybeImport('WhatsAppModule', '@softzenit/nest-whatsapp');
    maybeImport('WhatsAppMode', '@softzenit/nest-whatsapp');
    maybeImport('ConfigModule', '@nestjs/config');
    maybeImport('ConfigService', '@nestjs/config');

    // Build imports to add
    const importsToAdd: string[] = [];
    if (options.addHealth) {
      maybeImport('WhatsAppHealthModule', '@softzenit/nest-whatsapp/health');
      importsToAdd.push('WhatsAppHealthModule');
    }
    if (options.addMicro)
      importsToAdd.push(
        `WhatsAppModule.forMicroservice({ host: '${options.host}', port: ${options.port} })`
      );

    const sandboxRecipients =
      options.testRecipients && options.testRecipients.length
        ? `[${options.testRecipients.map((r) => `'${r}'`).join(', ')}]`
        : '[]';

    const sandboxFactory = `WhatsAppModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    mode: WhatsAppMode.SANDBOX,
    testPhoneNumberId: config.get<string>('WHATSAPP_SANDBOX_PHONE_NUMBER_ID') ?? '${
      options.testPhoneNumberId ?? '<phone_number_id>'
    }',
    temporaryAccessToken: config.get<string>('WHATSAPP_SANDBOX_ACCESS_TOKEN') ?? '${
      options.temporaryAccessToken ?? '<access_token>'
    }',
    testRecipients: config.get<string>('WHATSAPP_SANDBOX_TEST_RECIPIENTS')?.split(',') ?? ${sandboxRecipients}
  })
})`;

    const liveFactory = `WhatsAppModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    mode: WhatsAppMode.LIVE,
    businessAccountId: config.get<string>('WHATSAPP_LIVE_BUSINESS_ACCOUNT_ID') ?? '${
      options.businessAccountId ?? '<business_account_id>'
    }',
    phoneNumberId: config.get<string>('WHATSAPP_LIVE_PHONE_NUMBER_ID') ?? '${
      options.phoneNumberId ?? '<phone_number_id>'
    }',
    accessToken: config.get<string>('WHATSAPP_LIVE_ACCESS_TOKEN') ?? '${
      options.accessToken ?? '<access_token>'
    }'
  })
})`;

    importsToAdd.push(options.mode === 'sandbox' ? sandboxFactory : liveFactory);

    // Apply import
    if (importChanges.length) {
      const recorder = tree.beginUpdate(modulePath);
      for (const change of importChanges) {
        if (change instanceof InsertChange) {
          recorder.insertLeft(change.pos, change.toAdd);
        }
      }
      tree.commitUpdate(recorder);
    }

    // Try AST-based insertion first
    let merged = tree.read(modulePath)!.toString('utf-8');
    for (const expr of importsToAdd) {
      const astChanges =
        addSymbolToNgModuleMetadata(
          ts.createSourceFile(modulePath, merged, ts.ScriptTarget.Latest, true),
          modulePath,
          'imports',
          expr,
          null
        ) || [];
      if (astChanges.length) {
        const rec = tree.beginUpdate(modulePath);
        for (const c of astChanges) {
          if (c instanceof InsertChange) {
            rec.insertLeft(c.pos, c.toAdd);
          }
        }
        tree.commitUpdate(rec);
        merged = tree.read(modulePath)!.toString('utf-8');
        continue;
      }
      // Fallback string-based insertion for Nest @Module
      if (/imports\s*:\s*\[/.test(merged)) {
        merged = merged.replace(/imports\s*:\s*\[/, (m) => `${m} ${expr}, `);
      } else if (/@Module\(\{/.test(merged)) {
        merged = merged.replace(/@Module\(\{/, (m) => `${m} imports: [ ${expr} ], `);
      }
      tree.overwrite(modulePath, merged);
    }
    return tree;
  };
}
