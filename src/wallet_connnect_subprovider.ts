import { PartialTxParams, Subprovider } from '@0x/subproviders';
import { Callback, ErrorCallback } from '@0x/subproviders/lib/src/types';
import { JSONRPCRequestPayload } from 'ethereum-types';
import { WalletConnect } from 'walletconnect-node';

export class WalletConnectSubprovider extends Subprovider {
    private readonly _walletConnect: WalletConnect;
    constructor(walletConnect: WalletConnect) {
        super();
        this._walletConnect = walletConnect;
    }
    // tslint:disable-next-line:async-suffix
    public async handleRequest(payload: JSONRPCRequestPayload, next: Callback, end: ErrorCallback): Promise<void> {
        let txParams;
        switch (payload.method) {
            case 'eth_coinbase':
                try {
                    end(null, this._walletConnect.accounts[0]);
                } catch (err) {
                    end(err);
                }
                return;

            case 'eth_accounts':
                try {
                    end(null, this._walletConnect.accounts);
                } catch (err) {
                    end(err);
                }
                return;

            case 'eth_sendTransaction':
                txParams = payload.params[0];
                try {
                    const filledParams = await this._populateMissingTxParamsAsync(txParams);
                    const response = await this._walletConnect.sendTransaction(filledParams);
                    end(null, response);
                } catch (err) {
                    end(err);
                }
                return;

            case 'eth_signTransaction':
                end(new Error('eth_signTransaction not supported'));
                return;

            case 'eth_sign':
            case 'personal_sign':
                try {
                    const data = payload.method === 'eth_sign' ? payload.params[1] : payload.params[0];
                    const address = payload.method === 'eth_sign' ? payload.params[0] : payload.params[1];
                    console.log(payload);
                    const result = await this._walletConnect.signPersonalMessage([data, address]);
                    end(null, result);
                } catch (err) {
                    end(err);
                }
                return;
            case 'eth_signTypedData':
                try {
                    const signature = await this._walletConnect.signTypedData(payload.params);
                    end(null, signature);
                } catch (err) {
                    end(err);
                }
                return;

            default:
                next();
                return;
        }
    }
    private async _populateMissingTxParamsAsync(partialTxParams: PartialTxParams): Promise<PartialTxParams> {
        let txParams = partialTxParams;
        if (partialTxParams.gasPrice === undefined) {
            const gasPriceResult = await this.emitPayloadAsync({
                method: 'eth_gasPrice',
                params: [],
            });
            const gasPrice = gasPriceResult.result.toString();
            txParams = { ...txParams, gasPrice };
        }
        if (partialTxParams.nonce === undefined) {
            const nonceResult = await this.emitPayloadAsync({
                method: 'eth_getTransactionCount',
                params: [partialTxParams.from, 'pending'],
            });
            const nonce = nonceResult.result;
            txParams = { ...txParams, nonce };
        }
        if (partialTxParams.gas === undefined) {
            const gasResult = await this.emitPayloadAsync({
                method: 'eth_estimateGas',
                params: [partialTxParams],
            });
            const gas = gasResult.result.toString();
            txParams = { ...txParams, gas };
        }
        return txParams;
    }
}
