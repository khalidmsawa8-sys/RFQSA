import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:rfqsa_mobile/core/audio/sound_alert_service.dart';
import 'package:rfqsa_mobile/features/client/models/rfq_model.dart';
import 'package:rfqsa_mobile/features/vendor/repositories/vendor_repository.dart';

// Events
abstract class VendorRadarEvent extends Equatable {
  const VendorRadarEvent();
  @override
  List<Object?> get props => [];
}

class LoadRadarRfqsEvent extends VendorRadarEvent {
  final bool isSilent;
  const LoadRadarRfqsEvent({this.isSilent = false});
  @override
  List<Object?> get props => [isSilent];
}

class NewRfqRealtimeArrivedEvent extends VendorRadarEvent {
  final RfqModel newRfq;
  const NewRfqRealtimeArrivedEvent({required this.newRfq});
  @override
  List<Object?> get props => [newRfq];
}

class SubmitVendorQuoteEvent extends VendorRadarEvent {
  final String rfqId;
  final double totalPrice;
  final int deliveryDays;
  final double deliveryCost;
  final String? notes;
  final List<dynamic> items;
  final int prepDays;
  final int prepHours;
  final int prepMinutes;

  const SubmitVendorQuoteEvent({
    required this.rfqId,
    required this.totalPrice,
    required this.deliveryDays,
    required this.deliveryCost,
    this.notes,
    required this.items,
    this.prepDays = 0,
    this.prepHours = 2,
    this.prepMinutes = 0,
  });

  @override
  List<Object?> get props => [rfqId, totalPrice, deliveryDays];
}

// States
abstract class VendorRadarState extends Equatable {
  const VendorRadarState();
  @override
  List<Object?> get props => [];
}

class VendorRadarInitialState extends VendorRadarState {}

class VendorRadarLoadingState extends VendorRadarState {}

class VendorRadarLoadedState extends VendorRadarState {
  final List<RfqModel> rfqs;
  const VendorRadarLoadedState({required this.rfqs});
  @override
  List<Object?> get props => [rfqs];
}

class VendorQuoteSubmittingState extends VendorRadarState {}

class VendorQuoteSuccessState extends VendorRadarState {
  final String message;
  const VendorQuoteSuccessState({required this.message});
  @override
  List<Object?> get props => [message];
}

class VendorRadarErrorState extends VendorRadarState {
  final String error;
  const VendorRadarErrorState({required this.error});
  @override
  List<Object?> get props => [error];
}

// BLoC Implementation
class VendorRadarBloc extends Bloc<VendorRadarEvent, VendorRadarState> {
  final VendorRepository _repository;
  final SoundAlertService _soundAlertService = SoundAlertService();

  VendorRadarBloc({required VendorRepository repository})
      : _repository = repository,
        super(VendorRadarInitialState()) {
    on<LoadRadarRfqsEvent>(_onLoadRadarRfqs);
    on<NewRfqRealtimeArrivedEvent>(_onNewRfqArrived);
    on<SubmitVendorQuoteEvent>(_onSubmitVendorQuote);
  }

  Future<void> _onLoadRadarRfqs(LoadRadarRfqsEvent event, Emitter<VendorRadarState> emit) async {
    if (!event.isSilent) emit(VendorRadarLoadingState());
    final res = await _repository.fetchRadarRfqs();

    if (res.success) {
      emit(VendorRadarLoadedState(rfqs: res.data ?? []));
    } else {
      emit(VendorRadarErrorState(error: res.error ?? 'فشل تحميل رادار الطلبات'));
    }
  }

  Future<void> _onNewRfqArrived(NewRfqRealtimeArrivedEvent event, Emitter<VendorRadarState> emit) async {
    // 1. Play Distinctive Spare Parts RFQ Radar Sound Chime
    await _soundAlertService.playRfqRadarAlert();

    // 2. Prepend new RFQ to state
    if (state is VendorRadarLoadedState) {
      final currentList = List<RfqModel>.from((state as VendorRadarLoadedState).rfqs);
      if (!currentList.any((r) => r.id == event.newRfq.id)) {
        currentList.insert(0, event.newRfq);
        emit(VendorRadarLoadedState(rfqs: currentList));
      }
    }
  }

  Future<void> _onSubmitVendorQuote(SubmitVendorQuoteEvent event, Emitter<VendorRadarState> emit) async {
    emit(VendorQuoteSubmittingState());

    final res = await _repository.submitQuote(
      rfqId: event.rfqId,
      totalPrice: event.totalPrice,
      deliveryDays: event.deliveryDays,
      deliveryCost: event.deliveryCost,
      notes: event.notes,
      items: event.items,
      prepDays: event.prepDays,
      prepHours: event.prepHours,
      prepMinutes: event.prepMinutes,
    );

    if (res.success) {
      await _soundAlertService.playSuccessTone();
      emit(const VendorQuoteSuccessState(message: 'تم إرسال تسعيرتك للعميل بنجاح 🚀'));
      add(const LoadRadarRfqsEvent(isSilent: true));
    } else {
      emit(VendorRadarErrorState(error: res.error ?? 'فشل إرسال عرض السعر'));
    }
  }
}
