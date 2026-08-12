import {getImports, type Node, ts} from 'ng-morph';

import {ALL_TS_FILES} from '../../constants';
import {type TuiSchema} from '../../ng-add/schema';
import {addUniqueImport} from '../../utils/add-unique-import';
import {
    infoLog,
    REPLACE_SYMBOL,
    SMALL_TAB_SYMBOL,
    SUCCESS_SYMBOL,
    successLog,
} from '../../utils/colored-log';
import {getNamedImportReferences} from '../../utils/get-named-import-references';
import {removeImport} from '../../utils/import-manipulations';
import {setupProgressLogger} from '../../utils/progress';
import {type ReplacementIdentifierMulti} from '../interfaces/replacement-identifier';

export function replaceIdentifiers(
    options: TuiSchema,
    constants: readonly ReplacementIdentifierMulti[],
): void {
    !options['skip-logs'] &&
        infoLog(`${SMALL_TAB_SYMBOL}${REPLACE_SYMBOL} replacing identifiers...`);

    const progressLog = setupProgressLogger({total: constants.length});

    constants.forEach(({from, to}) => {
        toArray(from).forEach((x) => replaceIdentifier({from: x, to}));

        !options['skip-logs'] &&
            progressLog(
                toArray(from)
                    .map((x) => x.name)
                    .join(', '),
            );
    });

    !options['skip-logs'] &&
        successLog(`${SMALL_TAB_SYMBOL}${SUCCESS_SYMBOL} identifiers replaced \n`);
}

export function replaceIdentifier({from, to}: ReplacementIdentifierMulti): void {
    const fromList = toArray(from);

    const references = fromList
        .map(({name, moduleSpecifier}) => getNamedImportReferences(name, moduleSpecifier))
        .flat();

    references.forEach((ref) => {
        if (ref.wasForgotten() || isImportContext(ref)) {
            return;
        }

        const decorator = ref.getParentWhile(
            (node) => node.getKindName() !== 'Decorator',
        );

        const inModule =
            decorator?.getFirstChildIfKind(ts.SyntaxKind.Identifier)?.getText() ===
            'NgModule';

        ref.replaceWithText(getReplacementText(to, inModule));
    });

    // Rewrite the import declarations with a fresh lookup rather than the references
    // above. When an earlier entry edits the same declaration (e.g. adds a named
    // import via addUniqueImport), ng-morph hands back a stale reference whose parent
    // is the whole `NamedImports` node instead of the `ImportSpecifier`, so the old
    // import specifier is never rewritten — the case that left TuiMultiSelect /
    // TuiComboBox stuck in @taiga-ui/legacy.
    fromList.forEach(({name, moduleSpecifier}) =>
        rewriteImportDeclarations(name, moduleSpecifier, to),
    );
}

function isImportContext(ref: Node): boolean {
    const kind = ref.getParent()?.getKindName();

    return (
        kind === 'ImportSpecifier' || kind === 'NamedImports' || kind === 'ImportClause'
    );
}

function rewriteImportDeclarations(
    name: string,
    moduleSpecifier: string[] | string | undefined,
    to: ReplacementIdentifierMulti['to'],
): void {
    if (!moduleSpecifier) {
        return;
    }

    const declarations = getImports(ALL_TS_FILES, {
        namedImports: [name],
        moduleSpecifier: Array.isArray(moduleSpecifier)
            ? moduleSpecifier
            : [moduleSpecifier, `${moduleSpecifier}/**`],
    });

    declarations.forEach((declaration) => {
        const specifier = declaration
            .getNamedImports()
            .find((namedImport) => namedImport.getName() === name);

        if (specifier) {
            removeImport(specifier);
            addImports(to, declaration.getSourceFile().getFilePath());
        }
    });
}

function addImports(
    identifier: ReplacementIdentifierMulti['to'],
    filePath: string,
): void {
    toArray(identifier).forEach(({name, namedImport, moduleSpecifier}) => {
        if (moduleSpecifier) {
            addUniqueImport(filePath, namedImport || name, moduleSpecifier);
        }
    });
}

function getReplacementText(
    to: ReplacementIdentifierMulti['to'],
    inModule: boolean,
): string {
    return toArray(to)
        .map(({name, spreadInModule, callExpression}) => {
            if (spreadInModule && inModule) {
                return `...${name}`;
            }

            return callExpression ? `${name}()` : name;
        })
        .join(', ');
}

function toArray<T>(x: T | T[]): T[] {
    return Array.isArray(x) ? x : [x];
}
