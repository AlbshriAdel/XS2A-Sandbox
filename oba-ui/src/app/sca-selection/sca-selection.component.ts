import { Component, OnInit } from '@angular/core';
import { ScaUserDataTO } from '../api/models';
import { Router } from '@angular/router';
import { ShareDataService } from '../common/services/share-data.service';
import { ConsentAuthorizeResponse } from '../api/models';
import { AisService } from '../common/services/ais.service';
import { Subscription } from 'rxjs';
import { RoutingPath } from '../common/models/routing-path.model';
import { ObaUtils } from '../common/utils/oba-utils';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import {PisService} from "../common/services/pis.service";
import {PisCancellationService} from "../common/services/pis-cancellation.service";

@Component({
    selector: 'app-sca-selection',
    templateUrl: './sca-selection.component.html',
    styleUrls: ['./sca-selection.component.scss']
})
export class ScaSelectionComponent implements OnInit {

    private subscriptions: Subscription[] = [];
    private operation: string;
    public authResponse: ConsentAuthorizeResponse;
    public selectedScaMethod: ScaUserDataTO;
    public scaForm: FormGroup;

    constructor(
        private formBuilder: FormBuilder,
        private router: Router,
        private aisService: AisService,
        private pisService: PisService,
        private pisCancellationService: PisCancellationService,
        private shareService: ShareDataService) {
        this.scaForm = this.formBuilder.group({
            scaMethod: ['', Validators.required],
        });
    }

    ngOnInit() {
      // get current operation
      this.shareService.currentOperation
        .subscribe((operation: string) => {
          this.operation = operation;
        });

        // fetch data that we save before after login
        this.shareService.currentData.subscribe(data => {
            if (data) {
                // TODO extract the Accounts, Balances and Transactions from data.value https://git.adorsys.de/adorsys/xs2a/psd2-dynamic-sandbox/issues/9
                console.log('response object: ', data);
                this.shareService.currentData.subscribe(authResponse => {
                    this.authResponse = authResponse;
                    if (this.authResponse.scaMethods && this.authResponse.scaMethods.length === 1) {
                        this.selectedScaMethod = this.authResponse.scaMethods[0];
                    }
                });
            }
        });
    }

    public onSubmit(): void {
        console.log('selecting sca');
        if (!this.authResponse || !this.selectedScaMethod) {
            console.log('No sca method selected.');
            return;
        }

        if (this.operation == 'ais') {
          this.subscriptions.push(
            this.aisService.selectScaMethod({
              encryptedConsentId: this.authResponse.encryptedConsentId,
              authorisationId: this.authResponse.authorisationId,
              scaMethodId: this.selectedScaMethod.id
            }).subscribe(authResponse => {
              this.authResponse = authResponse;
              this.shareService.changeData(this.authResponse);
              this.router.navigate([`${RoutingPath.TAN_CONFIRMATION}`],
                ObaUtils.getQueryParams(this.authResponse.encryptedConsentId, this.authResponse.authorisationId));
            })
          );
        } else if (this.operation == 'pis') {
          this.pisService.selectScaMethod({
            encryptedPaymentId: this.authResponse.encryptedConsentId,
            authorisationId: this.authResponse.authorisationId,
            scaMethodId: this.selectedScaMethod.id
          }).subscribe(authResponse => {
            console.log(authResponse);
            this.authResponse = authResponse;
            this.shareService.changeData(this.authResponse);
            this.router.navigate([`${RoutingPath.TAN_CONFIRMATION}`],
              ObaUtils.getQueryParams(this.operation, null, this.authResponse.encryptedConsentId, this.authResponse.authorisationId, null));
          })
        } else if (this.operation == 'pis-cancellation') {
          this.pisCancellationService.selectScaMethod({
            encryptedPaymentId: this.authResponse.encryptedConsentId,
            authorisationId: this.authResponse.authorisationId,
            scaMethodId: this.selectedScaMethod.id
          }).subscribe(authResponse => {
            console.log(authResponse);
            this.authResponse = authResponse;
            this.shareService.changeData(this.authResponse);
            this.router.navigate([`${RoutingPath.TAN_CONFIRMATION}`],
              ObaUtils.getQueryParams(this.operation, null, this.authResponse.encryptedConsentId, this.authResponse.authorisationId, null));
          })
        }
    }

    // TODO: move to Oba Util https://git.adorsys.de/adorsys/xs2a/psd2-dynamic-sandbox/issues/9
    public onCancel(): void {
      this.router.navigate([`${RoutingPath.RESULT}`]);
      this.aisService.revokeConsent({
        encryptedConsentId: this.authResponse.encryptedConsentId,
        authorisationId: this.authResponse.authorisationId}).subscribe(authResponse => {
        this.shareService.changeData(authResponse);
        this.router.navigate([`${RoutingPath.RESULT}`],
          ObaUtils.getQueryParams(this.authResponse.encryptedConsentId, this.authResponse.authorisationId));
      });
    }

    get scaMehods(): ScaUserDataTO[] {
        return this.authResponse ? this.authResponse.scaMethods : [];
    }

    handleMethodSelectedEvent(scaMethod: ScaUserDataTO): void {
        console.log('No sca method selected.');
        this.selectedScaMethod = scaMethod;
    }
}
