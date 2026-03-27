import { UnitTestTree } from '@angular-devkit/schematics/testing';
import { Tree } from '@angular-devkit/schematics';
import { whatsapp } from './index';

describe('whatsapp schematic', () => {
  function createAppModule(): UnitTestTree {
    const tree = new UnitTestTree(Tree.empty());
    tree.create(
      'src/app.module.ts',
      `import { Module } from '@nestjs/common';
       @Module({ imports: [], controllers: [], providers: [] })
       export class AppModule {}`
    );
    return tree;
  }

  it('inserts sandbox forRootAsync and optional health/micro', () => {
    const rule = whatsapp({
      module: 'src/app.module.ts',
      mode: 'sandbox',
      addHealth: true,
      addMicro: true,
      host: '127.0.0.1',
      port: 4000,
    });
    const tree = rule(createAppModule(), {} as any) as UnitTestTree;
    const content = tree.readContent('src/app.module.ts');
    expect(content).toMatch(
      /import\s+\{[^}]*WhatsAppModule[^}]*\}\s+from\s+'@softzenit\/nest-whatsapp'/
    );
    expect(content).toMatch(
      /import\s+\{[^}]*WhatsAppMode[^}]*\}\s+from\s+'@softzenit\/nest-whatsapp'/
    );
    expect(content).toContain("import { ConfigModule } from '@nestjs/config'");
    expect(content).toContain("import { ConfigService } from '@nestjs/config'");
    expect(content).toContain(
      "import { WhatsAppHealthModule } from '@softzenit/nest-whatsapp/health'"
    );
    expect(content).toContain('WhatsAppHealthModule');
    expect(content).toContain("WhatsAppModule.forMicroservice({ host: '127.0.0.1', port: 4000 })");
    expect(content).toContain('WhatsAppModule.forRootAsync');
    expect(content).toContain('WhatsAppMode.SANDBOX');
  });

  it('inserts live forRootAsync', () => {
    const rule = whatsapp({
      module: 'src/app.module.ts',
      mode: 'live',
      addHealth: false,
      addMicro: false,
      host: '127.0.0.1',
      port: 4000,
      businessAccountId: 'b',
      phoneNumberId: 'p',
      accessToken: 't',
    });
    const tree = rule(createAppModule(), {} as any) as UnitTestTree;
    const content = tree.readContent('src/app.module.ts');
    expect(content).toMatch(
      /import\s+\{[^}]*WhatsAppModule[^}]*\}\s+from\s+'@softzenit\/nest-whatsapp'/
    );
    expect(content).toMatch(
      /import\s+\{[^}]*WhatsAppMode[^}]*\}\s+from\s+'@softzenit\/nest-whatsapp'/
    );
    expect(content).toContain('WhatsAppModule.forRootAsync');
    expect(content).toContain('WhatsAppMode.LIVE');
    expect(content).toContain(
      "businessAccountId: config.get<string>('WHATSAPP_LIVE_BUSINESS_ACCOUNT_ID') ?? 'b'"
    );
  });

  it('uses provided sandbox testRecipients and does not duplicate import', () => {
    const tree = createAppModule();
    // Pre-insert the import to force insertImport to no-op
    tree.overwrite(
      'src/app.module.ts',
      `import { Module } from '@nestjs/common';
       import { WhatsAppModule } from '@softzenit/nest-whatsapp';
       @Module({ imports: [], controllers: [], providers: [] })
       export class AppModule {}`
    );
    const rule = whatsapp({
      module: 'src/app.module.ts',
      mode: 'sandbox',
      addHealth: false,
      addMicro: false,
      host: '127.0.0.1',
      port: 4000,
      testPhoneNumberId: 'id',
      temporaryAccessToken: 'tok',
      testRecipients: ['+111', '+222'],
    });
    const updatedTree = rule(tree, {} as any) as UnitTestTree;
    const content = updatedTree.readContent('src/app.module.ts');
    // WhatsAppModule import should not be duplicated
    const whatsappPkgImportCount = (content.match(/from\s+'@softzenit\/nest-whatsapp'/g) || [])
      .length;
    expect(whatsappPkgImportCount).toBe(1);
    expect(content).toMatch(
      /import\s+\{[^}]*WhatsAppModule[^}]*\}\s+from\s+'@softzenit\/nest-whatsapp'/
    );
    expect(content).toContain('WhatsAppMode.SANDBOX');
    // Recipients rendered as array of strings
    expect(content).toContain(
      "testRecipients: config.get<string>('WHATSAPP_SANDBOX_TEST_RECIPIENTS')?.split(',') ?? ['+111', '+222']"
    );
  });

  it('throws when module path not found', () => {
    const rule = whatsapp({
      module: 'src/missing.module.ts',
      mode: 'live',
      addHealth: false,
      addMicro: false,
      host: 'x',
      port: 1,
    });
    expect(() => rule(new UnitTestTree(Tree.empty()), {} as any)).toThrow(
      'src/missing.module.ts not found'
    );
  });
});
